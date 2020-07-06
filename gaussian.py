from math import exp, pow



#x = number predicted by forecasts
#a = height of bump
#b = number predicted by users
#c = width of bump
def get_gaussian(x, a, b, c):
    return a * exp(-pow(x - b,2)/(2 * pow(c,2)))

#data is a list, higher indicates whether the user chose a point higher than the original point or not
def get_gaussian_for_all(data, b, higher):
    new_data = []
    a = 1000
    c = 10000
    for x in data:
    #for x in range(0, len(data)):
        gaussian = a * exp(-pow(x - b,2)/(2 * pow(c,2)))
        new_data.append(gaussian)
    print(new_data)
    zipped = zip(data, new_data)
    #data - new_data if user chose a lower point
    if not higher:
        print("subtract")
        sum = [x - y for (x, y) in zipped]
    else:
        print("add")
        sum = [x + y for (x, y) in zipped]
    return sum
#2858 -> 3078
#print(get_gaussian(1969,1300,3078,1600))
print(get_gaussian(4,100,3,1600))

#print(get_gaussian(108179,119733))

#11226

